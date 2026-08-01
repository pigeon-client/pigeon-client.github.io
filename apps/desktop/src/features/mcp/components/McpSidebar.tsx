import { useTabStore } from "@/features/request-builder";
import { deleteMcpOauth } from "../oauth/oauthDb";
import { useMcpTab } from "../store";

/**
 * Kind-aware sidebar content for the active MCP tab — tools/resources list,
 * Disconnect, Forget authorization. Sibling of `McpPanel` (which owns the connect
 * form, auth flow, and the selected-tool's form/call/result); both read/write the
 * same per-tab `features/mcp/store.ts` entry since neither is the other's parent.
 */
export function McpSidebar() {
  const activeTabId = useTabStore((s) => s.activeTabId);
  const tabId = activeTabId ?? "";
  const { state: mcp, patch } = useMcpTab(tabId);

  const handleSelectTool = (name: string) => {
    patch({
      selectedTool: name,
      argValues: {},
      rawArgsJson: "{}",
      callResult: undefined,
      callError: null,
    });
  };

  const handleDisconnect = () => {
    patch({
      session: null,
      tools: [],
      resources: [],
      selectedTool: null,
      callResult: undefined,
      callError: null,
      authorizedServerUrl: null,
      status: "idle",
    });
  };

  const handleForgetAuthorization = async () => {
    if (!mcp.authorizedServerUrl) return;
    await deleteMcpOauth(mcp.authorizedServerUrl);
    patch({ authorizedServerUrl: null });
  };

  if (mcp.status !== "connected") {
    return (
      <aside className="flex w-full min-w-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground min-h-0">
        <div className="flex flex-1 items-center justify-center p-5 text-center text-xs text-muted-foreground">
          Connect to an MCP server to see its tools here.
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-full min-w-0 flex-col overflow-y-auto border-r border-border bg-sidebar p-2 text-sidebar-foreground min-h-0">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tools
        </span>
        <div className="flex items-center gap-2">
          {mcp.authorizedServerUrl && (
            <button
              type="button"
              data-testid="mcp-forget-auth-btn"
              onClick={handleForgetAuthorization}
              className="text-2xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Forget authorization
            </button>
          )}
          <button
            type="button"
            onClick={handleDisconnect}
            className="text-2xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Disconnect
          </button>
        </div>
      </div>
      {mcp.tools.length === 0 && (
        <div className="px-1 py-2 text-2xs text-muted-foreground">No tools exposed.</div>
      )}
      {mcp.tools.map((t) => (
        <button
          key={t.name}
          type="button"
          data-testid={`mcp-tool-${t.name}`}
          onClick={() => handleSelectTool(t.name)}
          title={t.description}
          className={`mb-0.5 rounded px-2 py-1.5 text-left text-xs ${
            mcp.selectedTool === t.name
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent/50"
          }`}
        >
          {t.name}
        </button>
      ))}
      {mcp.resources.length > 0 && (
        <>
          <div className="mb-1.5 mt-3 px-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Resources
          </div>
          {mcp.resources.map((r) => (
            <div
              key={r.uri}
              className="truncate px-2 py-1 text-2xs text-muted-foreground"
              title={r.uri}
            >
              {r.name ?? r.uri}
            </div>
          ))}
        </>
      )}
    </aside>
  );
}
