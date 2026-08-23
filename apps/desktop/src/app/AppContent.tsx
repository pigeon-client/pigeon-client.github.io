import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@pigeon/ui";
import { invoke } from "@tauri-apps/api/core";
import { PanelLeftOpen } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { initializeAnalytics } from "@/core/analytics";
import { selectActiveEnv, useEnvStore } from "@/features/environments";
import { Onboarding } from "@/features/onboarding";
import { findNode, findUniqueSavedRequest, useCollectionStore } from "@/features/rest/collections";
import { useHistoryStore } from "@/features/rest/history";
import { generateCurl } from "@/features/rest/import-export";
import {
  EmptyRequestState,
  RequestEditor,
  selectTabShells,
  TabStrip,
  tabShellsEqual,
  UrlBar,
  useEqualStore,
  useTabStore,
} from "@/features/rest/request-builder";
import { ResponsePanel } from "@/features/rest/response-viewer";
import { applyTheme, checkForUpdates, getStoredTheme, type SettingsTab } from "@/features/settings";
import { startMacosCompositorKeepAlive } from "@/shared/lib/macosCompositorKeepAlive";
import { isTauri, waitForTauriIpc } from "@/shared/lib/platform";
import { clickVisibleSendButton } from "@/shared/lib/sendButton";
import { getWindowKind, refreshWindowKind, type WindowKind } from "@/shared/lib/windowKind";
import { AppContextMenu } from "./layout/AppContextMenu";
import { Header } from "./layout/Header";
import { MigrationToast } from "./layout/MigrationToast";
import { Sidebar } from "./layout/Sidebar";
import { UpdateToast } from "./layout/UpdateToast";

const CommandPalette = lazy(() =>
  // biome-ignore lint/style/noRestrictedImports: lazy() must target the component module, not the feature barrel
  import("@/features/command-palette/components/CommandPalette").then((m) => ({
    default: m.CommandPalette,
  })),
);
const EnvModal = lazy(() =>
  // biome-ignore lint/style/noRestrictedImports: lazy() must target the component module, not the feature barrel
  import("@/features/environments/components/EnvModal").then((m) => ({ default: m.EnvModal })),
);
const SaveToCollectionModal = lazy(() =>
  // biome-ignore lint/style/noRestrictedImports: lazy() must target the component module, not the feature barrel
  import("@/features/rest/collections/components/SaveToCollectionModal").then((m) => ({
    default: m.SaveToCollectionModal,
  })),
);
const ImportModal = lazy(() =>
  // biome-ignore lint/style/noRestrictedImports: lazy() must target the component module, not the feature barrel
  import("@/features/rest/import-export/components/ImportModal").then((m) => ({
    default: m.ImportModal,
  })),
);
const KeyboardShortcutsModal = lazy(() =>
  // biome-ignore lint/style/noRestrictedImports: lazy() must target the component module, not the feature barrel
  import("@/features/settings/components/KeyboardShortcutsModal").then((m) => ({
    default: m.KeyboardShortcutsModal,
  })),
);
const SettingsDrawer = lazy(() =>
  // biome-ignore lint/style/noRestrictedImports: lazy() must target the component module, not the feature barrel
  import("@/features/settings/components/SettingsDrawer").then((m) => ({
    default: m.SettingsDrawer,
  })),
);
const ComingSoonWorkspace = lazy(() =>
  // biome-ignore lint/style/noRestrictedImports: lazy() must target the component module, not the feature barrel
  import("@/features/workspaces/components/ComingSoonWorkspace").then((m) => ({
    default: m.ComingSoonWorkspace,
  })),
);

function scheduleIdle(fn: () => void): void {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(fn, { timeout: 4000 });
    return;
  }
  setTimeout(fn, 3000);
}

/** Focus the REST OS window when leaving a coming-soon view (desktop only). */
function focusRestWindow() {
  if (!isTauri()) return;
  invoke("open_workspace_window", { kind: "rest" }).catch((e) =>
    console.error(`[Pigeon] Failed to focus REST workspace: ${e}`),
  );
}

function getActiveHttpTab() {
  const { tabs, activeTabId } = useTabStore.getState();
  const tab = tabs.find((t) => t.id === activeTabId);
  if (tab?.kind !== "http") return null;
  return tab;
}

/* ── Empty state when no URL has been typed yet ── */
export function AppContent() {
  const windowKind = getWindowKind();

  useEffect(() => {
    applyTheme(getStoredTheme());
    useEnvStore.getState().load();
    void (async () => {
      await waitForTauriIpc();
      if (isTauri() && navigator.platform.toLowerCase().includes("mac")) {
        startMacosCompositorKeepAlive();
      }
      refreshWindowKind();
      // Coming-soon OS windows (legacy) still skip REST-only boot work.
      if (getWindowKind() === "rest") {
        void useHistoryStore.getState().load();
        void useCollectionStore.getState().load();
        scheduleIdle(() => checkForUpdates(true));
        // Anonymous install/launch telemetry — never awaited; failures are ignored.
        scheduleIdle(() => initializeAnalytics());
      }
    })();
  }, [windowKind]);

  // Retry DB load when the tab regains focus after a failed or skipped initial load,
  // or when sidebar data was previously present but the in-memory store went empty.
  useEffect(() => {
    if (windowKind !== "rest") return;
    const compositorKeepAlive = () => window.__pigeonMacCompositorKeepAlive === true;
    const retryLoad = () => {
      if (compositorKeepAlive()) {
        if (!document.hasFocus()) return;
      } else if (document.visibilityState !== "visible") {
        return;
      }
      const coll = useCollectionStore.getState();
      const hist = useHistoryStore.getState();
      if (!coll.loaded) {
        void coll.load();
      } else if (coll.hadData && coll.collections.length === 0) {
        void coll.reload();
      }
      if (!hist.loaded) {
        void hist.load();
      } else if (hist.hadData && hist.drafts.length === 0 && hist.history.length === 0) {
        void hist.reload();
      }
    };
    // Visibility is spoofed while the macOS compositor keepalive is on, so hide/show
    // must not drive retries. Focus still covers a real return to the window.
    const onVisibilityChange = () => {
      if (compositorKeepAlive()) return;
      retryLoad();
    };
    if (!compositorKeepAlive()) {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
    window.addEventListener("focus", retryLoad);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", retryLoad);
    };
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

  const tabShells = useEqualStore(useTabStore, (s) => selectTabShells(s.tabs), tabShellsEqual);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const addTab = useTabStore((s) => s.addTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const setTabCollectionRef = useTabStore((s) => s.setTabCollectionRef);
  const activeHasHttpUrl = useTabStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return Boolean(tab && tab.kind === "http" && tab.request.url.trim());
  });
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
    const tab = getActiveHttpTab();
    if (!tab?.request.url.trim()) return;
    await navigator.clipboard.writeText(generateCurl(tab.request));
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
    const activeTab = getActiveHttpTab();
    const activeRequest = activeTab?.request;
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
  }, [flashSaveToast, setTabCollectionRef]);

  // ⌘Enter must win over focused inputs (URL bar, editors) and autocomplete Enter.
  useEffect(() => {
    const onMetaEnter = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.code !== "Enter") return;
      if (showPalette) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      clickVisibleSendButton();
    };
    window.addEventListener("keydown", onMetaEnter, true);
    return () => window.removeEventListener("keydown", onMetaEnter, true);
  }, [showPalette]);

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
        if (getActiveHttpTab()?.request.url.trim()) {
          setShowSaveModal(true);
        }
        return;
      }
      if (meta && !e.altKey && /^Digit[1-9]$/.test(e.code)) {
        e.preventDefault();
        const tab = tabShells[parseInt(e.code.slice(5), 10) - 1];
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
    tabShells,
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
    openSettings,
    handleSaveRequest,
  ]);

  const saveModalRequest = showSaveModal ? getActiveHttpTab()?.request : null;

  return (
    <AppContextMenu>
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
        exportDisabled={!activeHasHttpUrl || showComingSoon}
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
          <Suspense fallback={null}>
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
          </Suspense>
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

                {tabShells.map((tab) => {
                  if (tab.kind !== "http") return null;
                  const isActive = tab.id === activeTabId;
                  return (
                    <div
                      key={tab.id}
                      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                      style={{ display: isActive ? "flex" : "none" }}
                    >
                      <UrlBar tabId={tab.id} />
                      {tab.hasUrl ? (
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
      <Suspense fallback={null}>
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
        {showSaveModal && saveModalRequest?.url.trim() && (
          <SaveToCollectionModal
            request={saveModalRequest}
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
      </Suspense>

      <MigrationToast />
      <UpdateToast onOpenSettings={openSettings} />
      <Onboarding />
      {saveToast && (
        <div className="fixed bottom-4 right-4 z-toast rounded-lg border border-primary/40 bg-card px-4 py-3 text-xs font-medium text-foreground shadow-toast">
          Saved to collection
        </div>
      )}
    </AppContextMenu>
  );
}
