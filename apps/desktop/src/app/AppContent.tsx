import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@pigeon/ui";
import { invoke } from "@tauri-apps/api/core";
import { PanelLeftOpen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommandPalette } from "@/features/command-palette";
import { EnvModal, selectActiveEnv, useEnvStore } from "@/features/environments";
import {
  findNode,
  findUniqueSavedRequest,
  SaveToCollectionModal,
  useCollectionStore,
} from "@/features/rest/collections";
import { useHistoryStore } from "@/features/rest/history";
import { generateCurl, ImportModal } from "@/features/rest/import-export";
import {
  EmptyRequestState,
  RequestEditor,
  TabStrip,
  UrlBar,
  useTabStore,
} from "@/features/rest/request-builder";
import { ResponsePanel } from "@/features/rest/response-viewer";
import {
  applyTheme,
  checkForUpdates,
  getStoredTheme,
  KeyboardShortcutsModal,
  SettingsDrawer,
  type SettingsTab,
} from "@/features/settings";
import { ComingSoonWorkspace } from "@/features/workspaces";
import { isTauri } from "@/shared/lib/platform";
import { getWindowKind, type WindowKind } from "@/shared/lib/windowKind";
import { Header } from "./layout/Header";
import { MigrationToast } from "./layout/MigrationToast";
import { Sidebar } from "./layout/Sidebar";
import { UpdateToast } from "./layout/UpdateToast";

/** Focus the REST OS window when leaving a coming-soon view (desktop only). */
function focusRestWindow() {
  if (!isTauri()) return;
  invoke("open_workspace_window", { kind: "rest" }).catch((e) =>
    console.error(`[Pigeon] Failed to focus REST workspace: ${e}`),
  );
}

/* ── Empty state when no URL has been typed yet ── */
export function AppContent() {
  const windowKind = getWindowKind();

  useEffect(() => {
    applyTheme(getStoredTheme());
    useEnvStore.getState().load();
    // Coming-soon OS windows (legacy) still skip REST-only boot work.
    if (windowKind === "rest") {
      useHistoryStore.getState().load();
      useCollectionStore.getState().load();
      checkForUpdates(true);
    }
  }, [windowKind]);

  const [workbench, setWorkbench] = useState<WindowKind>(
    windowKind === "rest" ? "rest" : windowKind,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const saveToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("General");
  const [showPalette, setShowPalette] = useState(false);

  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const addTab = useTabStore((s) => s.addTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const setTabCollectionRef = useTabStore((s) => s.setTabCollectionRef);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  // Only http tabs have an exportable/saveable request.
  const activeRequest = activeTab && activeTab.kind === "http" ? activeTab.request : null;
  const prodActive = useEnvStore((s) => selectActiveEnv(s)?.isProduction ?? false);
  const showComingSoon = workbench === "mcp" || workbench === "graphql";

  const openSettings = (tab: SettingsTab = "General") => {
    setSettingsTab(tab);
    setShowSettings(true);
  };

  const openWorkbench = (kind: WindowKind) => {
    setWorkbench(kind);
    if (kind === "rest") focusRestWindow();
  };

  const handleExportCurl = async () => {
    if (!activeRequest) return;
    await navigator.clipboard.writeText(generateCurl(activeRequest));
    setCurlCopied(true);
    setTimeout(() => setCurlCopied(false), 2000);
  };

  const flashSaveToast = useCallback(() => {
    setSaveToast(true);
    if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
    saveToastTimer.current = setTimeout(() => setSaveToast(false), 2000);
  }, []);

  /** ⌘S: update existing collection node when linked; otherwise open save modal. */
  const handleSaveRequest = useCallback(() => {
    if (!(activeRequest?.url.trim() && activeTab)) return;

    const collections = useCollectionStore.getState().collections;
    let ref = activeTab.collectionRef ?? null;

    // Stale or missing link — try to recover a unique method+url match.
    if (ref) {
      const collection = collections.find((c) => c.id === ref?.collectionId);
      const node = collection ? findNode(collection.root, ref.nodeId) : null;
      if (node?.type !== "request") {
        ref = null;
        setTabCollectionRef(activeTab.id, null);
      }
    }
    if (!ref) {
      ref = findUniqueSavedRequest(collections, activeRequest.method, activeRequest.url);
      if (ref) setTabCollectionRef(activeTab.id, ref);
    }

    if (ref) {
      void useCollectionStore
        .getState()
        .updateRequest(ref.collectionId, ref.nodeId, activeRequest, activeTab.name)
        .then((ok) => {
          if (ok) flashSaveToast();
          else setShowSaveModal(true);
        });
      return;
    }

    setShowSaveModal(true);
  }, [activeRequest, activeTab, flashSaveToast, setTabCollectionRef]);

  // Keyboard shortcuts follow Postman's core desktop bindings where this app has
  // an equivalent action. Matching uses e.code because Shift changes e.key.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const metaShift = meta && e.shiftKey;
      if (metaShift && e.code === "KeyK") {
        e.preventDefault();
        setShowPalette((o) => !o);
        return;
      }
      if (meta && !e.shiftKey && e.code === "KeyK") {
        e.preventDefault();
        setShowPalette((o) => !o);
        return;
      }
      if (metaShift && e.code === "KeyP") {
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
      if (meta && !e.shiftKey && e.code === "KeyT") {
        e.preventDefault();
        const id = addTab();
        setActiveTab(id);
        return;
      }
      if (meta && e.code === "KeyW") {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
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
      if (meta && !e.shiftKey && e.code === "KeyF") {
        e.preventDefault();
        const input = searchInputRef.current;
        if (input) {
          input.focus();
          input.select();
        }
        return;
      }
      if (meta && !e.shiftKey && e.code === "KeyL") {
        e.preventDefault();
        const input = Array.from(
          document.querySelectorAll<HTMLInputElement>('[data-testid="url-input"]'),
        ).find((element) => element.offsetParent !== null);
        input?.focus();
        input?.select();
        return;
      }
      if (meta && !e.shiftKey && e.code === "KeyS") {
        e.preventDefault();
        handleSaveRequest();
        return;
      }
      if (metaShift && e.code === "KeyS") {
        e.preventDefault();
        // Save As — always pick collection/folder.
        if (activeRequest?.url.trim()) {
          setShowSaveModal(true);
        }
        return;
      }
      if (meta && !e.altKey && /^Digit[1-9]$/.test(e.code)) {
        e.preventDefault();
        const tab = tabs[parseInt(e.code.slice(5), 10) - 1];
        if (tab) setActiveTab(tab.id);
        return;
      }
      if (meta && e.code === "Comma") {
        e.preventDefault();
        openSettings("General");
        return;
      }
      if (meta && e.altKey && e.code === "Digit1") {
        e.preventDefault();
        const sidebarButton = document.querySelector<HTMLElement>(
          '[data-testid="sidebar-new-request"], [data-testid="sidebar-expand"]',
        );
        sidebarButton?.focus();
        return;
      }
      if (meta && e.altKey && e.code === "Digit2") {
        e.preventDefault();
        const urlInput = Array.from(
          document.querySelectorAll<HTMLInputElement>('[data-testid="url-input"]'),
        ).find((element) => element.offsetParent !== null);
        urlInput?.focus();
        return;
      }
      if (meta && !e.shiftKey && e.code === "Backslash") {
        e.preventDefault();
        if (!showComingSoon) setSidebarCollapsed((collapsed) => !collapsed);
        return;
      }
      if (metaShift && e.code === "KeyE") {
        e.preventDefault();
        setShowEnvModal(true);
        return;
      }
      if (metaShift && e.code === "KeyR") {
        e.preventDefault();
        setWorkbench("rest");
        focusRestWindow();
        return;
      }
      if (metaShift && e.code === "KeyM") {
        e.preventDefault();
        setWorkbench("mcp");
        return;
      }
      if (metaShift && e.code === "KeyG") {
        e.preventDefault();
        setWorkbench("graphql");
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    activeTabId,
    activeTab,
    tabs,
    addTab,
    closeTab,
    setActiveTab,
    showComingSoon,
    showShortcutsModal,
    showEnvModal,
    showImportModal,
    showSaveModal,
    showSettings,
    showPalette,
    activeRequest,
    openSettings,
    handleSaveRequest,
  ]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground">
      {/* Topbar */}
      <Header
        onOpenSettings={openSettings}
        onExportCurl={handleExportCurl}
        onManageEnv={() => setShowEnvModal(true)}
        onOpenRest={() => openWorkbench("rest")}
        onOpenMcp={() => openWorkbench("mcp")}
        onOpenGraphql={() => openWorkbench("graphql")}
        activeWorkspace={workbench}
        curlCopied={curlCopied}
        exportDisabled={!activeRequest || showComingSoon}
        search={search}
        onSearchChange={setSearch}
        searchInputRef={searchInputRef}
        searchFocused={searchFocused}
        onSearchFocus={() => setSearchFocused(true)}
        onSearchBlur={() => setSearchFocused(false)}
      />

      {/* Body — MCP/GraphQL: coming-soon page only (no sidebar, no tab strip). */}
      {showComingSoon ? (
        <div className="relative flex min-h-0 min-w-0 flex-1">
          {workbench === "mcp" ? (
            <ComingSoonWorkspace
              kind="mcp"
              title="MCP — coming soon"
              description="A dedicated MCP bench — connect to servers, list tools, call them, and inspect results — is on the roadmap. Until then, stick with REST."
            />
          ) : (
            <ComingSoonWorkspace
              kind="graphql"
              title="GraphQL — coming soon"
              description="A dedicated GraphQL workspace — query editor with schema introspection, variables, and response inspection — is on the roadmap. Until then, send GraphQL as HTTP with an application/graphql body."
            />
          )}
        </div>
      ) : (
        <div className="relative flex min-h-0 min-w-0 flex-1">
          {sidebarCollapsed && (
            <button
              type="button"
              data-testid="sidebar-expand"
              onClick={() => setSidebarCollapsed(false)}
              title="Show sidebar"
              aria-label="Show sidebar"
              className="absolute bottom-2 left-2 z-sticky flex h-7 w-7 items-center justify-center rounded border border-border bg-sidebar text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}

          <ResizablePanelGroup
            id="workspace-layout"
            orientation="horizontal"
            defaultLayout={{ "sidebar-panel": 20, "main-panel": 80 }}
            className="min-h-0 min-w-0 flex-1"
            resizeTargetMinimumSize={{ coarse: 24, fine: 12 }}
          >
            {!sidebarCollapsed && (
              <ResizablePanel
                id="sidebar-panel"
                minSize="180px"
                maxSize="400px"
                groupResizeBehavior="preserve-pixel-size"
                className="flex min-h-0 min-w-0 flex-col"
              >
                <div className="flex h-full min-h-0 min-w-0 flex-shrink-0">
                  <Sidebar
                    onImportClick={() => setShowImportModal(true)}
                    onCollapse={() => setSidebarCollapsed(true)}
                    search={search}
                  />
                </div>
              </ResizablePanel>
            )}
            {!sidebarCollapsed && (
              <ResizableHandle withHandle id="sidebar-resize-handle" aria-label="Resize sidebar" />
            )}

            <ResizablePanel
              id="main-panel"
              minSize="300px"
              className="flex min-h-0 min-w-0 flex-col"
            >
              <div
                data-testid={prodActive ? "env-prod-indicator" : undefined}
                className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background"
              >
                <TabStrip />

                {tabs.map((tab) => {
                  if (tab.kind !== "http") return null;
                  const isActive = tab.id === activeTabId;
                  const hasUrl = tab.request.url.trim().length > 0;
                  return (
                    <div
                      key={tab.id}
                      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                      style={{ display: isActive ? "flex" : "none" }}
                    >
                      <UrlBar />
                      {hasUrl ? (
                        <ResizablePanelGroup
                          id={`response-split-${tab.id}`}
                          orientation="vertical"
                          defaultLayout={{
                            [`request-panel-${tab.id}`]: 55,
                            [`response-panel-${tab.id}`]: 45,
                          }}
                          className="min-h-0 flex-1"
                          resizeTargetMinimumSize={{ coarse: 24, fine: 12 }}
                        >
                          <ResizablePanel
                            id={`request-panel-${tab.id}`}
                            defaultSize="55%"
                            minSize="150px"
                            className="flex min-h-0 min-w-0 flex-col"
                          >
                            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                              <RequestEditor tabId={tab.id} />
                            </div>
                          </ResizablePanel>
                          <ResizableHandle
                            withHandle
                            id="response-resize-handle"
                            aria-label="Resize request and response panels"
                          />
                          <ResizablePanel
                            id={`response-panel-${tab.id}`}
                            defaultSize="45%"
                            minSize="160px"
                            className="flex min-h-0 min-w-0 flex-col"
                          >
                            <ResponsePanel tabId={tab.id} />
                          </ResizablePanel>
                        </ResizablePanelGroup>
                      ) : (
                        <div className="flex min-h-0 flex-1 flex-col">
                          <EmptyRequestState />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}

      {/* Modals */}
      {showEnvModal && <EnvModal onClose={() => setShowEnvModal(false)} />}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportRequest={(parsed) => {
            const id = addTab();
            useTabStore.getState().updateTabRequest(id, parsed);
            setActiveTab(id);
          }}
        />
      )}
      {showSaveModal && activeRequest && (
        <SaveToCollectionModal
          request={activeRequest}
          onClose={() => setShowSaveModal(false)}
          onSaved={(origin) => {
            if (activeTabId) setTabCollectionRef(activeTabId, origin);
            flashSaveToast();
          }}
        />
      )}
      {showShortcutsModal && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}
      {showSettings && (
        <SettingsDrawer initialTab={settingsTab} onClose={() => setShowSettings(false)} />
      )}
      {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}

      <MigrationToast />
      <UpdateToast onOpenSettings={openSettings} />
      {saveToast && (
        <div className="fixed bottom-4 right-4 z-toast rounded-lg border border-primary/40 bg-card px-4 py-3 text-xs font-medium text-foreground shadow-toast">
          Saved to collection
        </div>
      )}
    </div>
  );
}
