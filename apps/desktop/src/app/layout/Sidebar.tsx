import { Button, TabButton } from "@pigeon/ui";
import { PanelLeftClose, Plus, Upload } from "lucide-react";
import { useState } from "react";
import { CollectionsTab } from "@/features/rest/collections";
import type { HistoryItem } from "@/features/rest/history";
import {
  DraftTab,
  HistoryTab,
  snapshotToApiResponse,
  useHistoryStore,
} from "@/features/rest/history";
import { useTabStore } from "@/features/rest/request-builder";
import type { RequestConfig } from "@/shared/types";

type SidebarTab = "history" | "draft" | "collections";

/* ── Main Sidebar ── */
interface SidebarProps {
  onImportClick: () => void;
  onCollapse: () => void;
  search: string;
}

export function Sidebar({ onImportClick, onCollapse, search }: SidebarProps) {
  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const updateTabResponse = useTabStore((s) => s.updateTabResponse);

  const historyCount = useHistoryStore((s) => s.history.length);
  const draftsCount = useHistoryStore((s) => s.drafts.length);

  const [activeTab, setActiveTabState] = useState<SidebarTab>("draft");

  const loadRequest = (
    req: RequestConfig,
    origin?: { collectionId: string; nodeId: string },
  ): string => useTabStore.getState().openRequestTab(req, origin ?? null);

  /* History rows carry a response snapshot — render it immediately, no re-send. */
  const loadHistoryItem = (item: HistoryItem) => {
    void (async () => {
      const hydrated = await useHistoryStore.getState().ensureSnapshot(item);
      const id = loadRequest(hydrated.request);
      updateTabResponse(id, snapshotToApiResponse(hydrated));
    })();
  };

  const handleNewRequest = () => {
    const id = addTab();
    setActiveTab(id);
  };

  return (
    <aside className="flex w-full min-w-0 flex-col bg-sidebar text-sidebar-foreground min-h-0">
      {/* New Request + Import */}
      <div className="flex flex-shrink-0 gap-2 px-2.5 pt-3 pb-1.5">
        <Button
          variant="outline"
          size="sm"
          data-testid="sidebar-new-request"
          onClick={handleNewRequest}
          className="flex-1 justify-center font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          New Request
        </Button>
        <Button
          variant="outline"
          size="sm"
          data-testid="sidebar-import"
          onClick={onImportClick}
          title="Import cURL"
        >
          <Upload className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Sidebar tabs — 3 equal columns */}
      <div className="grid grid-cols-3 gap-1 px-2 pt-1">
        {(["history", "draft", "collections"] as SidebarTab[]).map((t) => (
          <TabButton
            key={t}
            variant="sidebar"
            testId={`sidebar-tab-${t}`}
            active={activeTab === t}
            onClick={() => setActiveTabState(t)}
          >
            <span className="cursor-pointer">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
          </TabButton>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-0 py-0.5 pb-3.5">
        {search.trim() && (
          <div className="mx-2 mb-1 flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1 text-2xs text-muted-foreground">
            <span className="truncate">Filtering: “{search.trim()}”</span>
          </div>
        )}
        {activeTab === "history" && <HistoryTab search={search} onLoad={loadHistoryItem} />}
        {activeTab === "draft" && <DraftTab search={search} onSelect={loadRequest} />}
        {activeTab === "collections" && <CollectionsTab search={search} onSelect={loadRequest} />}
      </div>

      {/* Status bar */}
      <div className="flex h-6 flex-shrink-0 items-center justify-between border-t border-border px-2">
        <span className="pl-1 text-2xs text-muted-foreground">
          {historyCount} requests · {draftsCount} drafts
        </span>
        <button
          type="button"
          data-testid="sidebar-collapse"
          onClick={onCollapse}
          title="Hide sidebar"
          aria-label="Hide sidebar"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
